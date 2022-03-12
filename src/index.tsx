import SyntheticStylesheet from "./SyntheticStylesheet";
import hash from "./hash";
import {useContext, createContext} from "react";

type Declarations<T> = Readonly<{
  [namespace: string]: T;
}>;

type StylesClassnamesMap = Readonly<{
  [type: string]: string;
}>;

export type StyleDeclaration = Readonly<{
  [type: string]: string | number | undefined | StyleDeclaration;
}>;

export type RestrictedStyles<T extends {}> = Readonly<
  T & {
    ":link"?: T;
    ":focus-within"?: T;
    ":first-child"?: T;
    ":last-child"?: T;
    ":odd-child"?: T;
    ":even-child"?: T;
    ":hover"?: T;
    ":focus"?: T;
    ":active"?: T;
    ":visited"?: T;
    ":disabled"?: T;
  }
>;

export type StyleDeclarationTransform = (
  styles: StyleDeclaration,
) => StyleDeclaration;

type AnimationDeclaration = Readonly<{
  [key: string]: StyleDeclaration;
}>;

function getCSSName(name: string): string {
  return name.replace(/[A-Z]/g, letter => {
    return `-${letter.toLowerCase()}`;
  });
}

type Transform = (styles: StyleDeclaration) => StyleDeclaration;

let animationName = 0;
export type SSRCaptureProps<T> = {contents: string; ids: Array<keyof T>};

export const StylerInlineContext = createContext<boolean>(false);

export const useInlineContext = () => {
  return useContext(StylerInlineContext);
};


export default class Styler<T extends StyleDeclaration = StyleDeclaration> {
  production: boolean = false; // set to true to avoid hashing
  transforms: ReadonlyArray<Transform>;

  alreadyInjected: Set<keyof T> = new Set<keyof T>();
  alreadyInjectedGlobals: Set<string> = new Set<string>();
  styleElement: HTMLStyleElement | undefined;
  syntheticSheet = new SyntheticStylesheet();

  constructor({
    production = false,
    transforms = [],
  }: {
    production?: boolean;
    transforms?: ReadonlyArray<Transform>;
  }) {
    this.production = production;
    this.transforms = transforms;

    // in production we wont be injecting styles, we will be assuming theyre there
    if (!this.production && typeof window !== "undefined") {
      if (window?.document?.head !== undefined) {
        this.initializeStyleElement();
      }
    }
  }

  injectGlobal(styles: string): void {
    if (!this.alreadyInjectedGlobals.has(styles)) {
      this.alreadyInjectedGlobals.add(styles);
      const sheet = this.styleElement?.sheet ?? this.syntheticSheet;
      sheet.insertRule(styles, 0);
    }
  }

  keyframes(map: AnimationDeclaration): string {
    const sheet = this.styleElement?.sheet ?? this.syntheticSheet;
    const name = `a${hash((animationName++).toFixed(0), 57482)}`;
    const breakPoints = Object.keys(map).map(bp => {
      const rules = map[bp];
      const ruleStr = Object.keys(rules)
        .map(ruleName => {
          const cssName = getCSSName(String(ruleName));
          return `${cssName}: ${rules[ruleName]};`;
        })
        .join("\n");
      return `${bp} {
      ${ruleStr}
    }`;
    });
    sheet.insertRule(`
      @keyframes ${name} {
        ${breakPoints.join("\n")}
      }`);
    return name;
  }

  initializeStyleElement(): void {
    let styleTag = window.document.querySelector(
      'head style[data-renderer="styler"]',
    );
    if (styleTag == null) {
      styleTag = window.document.createElement("style");
      styleTag.setAttribute("data-renderer", "styler");
      styleTag.setAttribute("data-renderer-phase", "client");
      styleTag.appendChild(document.createTextNode(""));
      window.document.head.appendChild(styleTag);
    }
    if (styleTag instanceof HTMLStyleElement) {
      this.styleElement = styleTag;
    }
  }

  create<D extends Declarations<T>>(
    declarations: D,
  ): Record<keyof D, StylesClassnamesMap> {
    const styleSheet = {};
    const names = Object.keys(declarations);
    names.forEach((name: keyof D) => {
      const styles = declarations[name];
      const classNames = this.injectStyles<T>(styles);
      // @ts-ignore
      styleSheet[name] = classNames;
    });
    // @ts-ignore
    return styleSheet;
  }

  cx = (
    ...rest: Array<StylesClassnamesMap | false | null | undefined>
  ): string => {
    return this.getClassNames(this.compose(...rest));
  };

  compose(
    ...rest: Array<StylesClassnamesMap | false | null | undefined>
  ): StylesClassnamesMap {
    const mergedStyles = rest.reduce(
      (
        acc: StylesClassnamesMap,
        style: StylesClassnamesMap | false | null | undefined,
      ) => {
        if (style && style != null) {
          return {...acc, ...style};
        }
        return acc;
      },
      {},
    );
    return mergedStyles;
  }

  getClassNames(mergedStyles: StylesClassnamesMap): string {
    return Object.values(mergedStyles).join(" ");
  }

  ssrCapture(): SSRCaptureProps<T> {
    return {
      contents: this.syntheticSheet.toString(),
      ids: Array.from(this.alreadyInjected),
    };
  }

  rehydrate({ids}: {contents: string; ids: Array<keyof T>}): void {
    ids.forEach(this.alreadyInjected.add);
  }

  runTransforms(styles: StyleDeclaration): StyleDeclaration {
    return this.transforms.reduce(
      (
        s: StyleDeclaration,
        transform: StyleDeclarationTransform,
      ): StyleDeclaration => transform(s),
      styles,
    );
  }

  // div<D extends Declarations<T>>( // need to do a babel plugin to automate this into createElement
  //   styles: T,
  //   optional?: D,
  // ): React.FunctionalComponent<
  //   Record<keyof D, boolean> & React.HTMLProps<HTMLDivElement>
  // > {
  //   return this.createElement("div", styles, optional);
  // }


  // createElement<
  //   K extends keyof JSX.IntrinsicElements,
  //   D extends Declarations<T>,
  //   TProps extends Record<keyof D, boolean> & JSX.IntrinsicElements[K],
  // >(tagName: K, styles: T, optional?: D): React.FunctionComponent<TProps> {
  //   const keys = optional != null ? Object.keys(optional) : [];
  //   const keysAsSet = new Set(keys);
  //   const Tag = tagName;
  //   const classNames = this.injectStyles<T>(styles);
  //   const optionalClassNames = keys.reduce((acc, key) => {
  //     return {
  //       ...acc,
  //       [key]: optional != null ? this.injectStyles<T>(optional[key]) : null,
  //     };
  //   }, {});
  //   const component = (props: TProps) => {
  //     const inline = useInlineContext();
  //     let stylesToApply = classNames;
  //     if (keys.length > 0) {
  //       const enabledProperties = keys
  //         .filter(k => props[k])
  //         .map(k => optionalClassNames[k]);
  //       stylesToApply = this.compose(
  //         stylesToApply,
  //         ...enabledProperties,
  //         inline ? otherProps.style : null,
  //       );
  //     }
  //     const otherProps = Object.keys(props)
  //       .filter((k: string) => {
  //         return !keysAsSet.has(k);
  //       })
  //       .reduce((o: TProps & {[k in keyof D]?: void}, k: keyof TProps) => {
  //         o[k] = props[k];
  //         return o;
  //       }, {});
  //     if (inline) {
  //       return <Tag style={stylesToApply} {...otherProps} />;
  //     } else {
  //       return (
  //         <Tag className={this.getClassNames(stylesToApply)} {...otherProps} />
  //       );
  //     }
  //   };
  //   component.displayName = `Styler<${tagName}>`;
  //   return component;
  // }

  injectStyles<T extends StyleDeclaration>(
    originalStyles: T,
    modifier?: string,
  ): StylesClassnamesMap {
    if (typeof originalStyles !== "object") {
      return {};
    }
    const sheet = this.styleElement?.sheet ?? this.syntheticSheet;
    const styles = this.runTransforms(originalStyles);
    const keys: string[] = Object.keys(styles);
    return keys.reduce((acc: StylesClassnamesMap, styleName: string) => {
      const value = styles[styleName];
      if (value == null) {
        return acc;
      }
      if (
        typeof styleName === "string" &&
        styleName.startsWith(":") &&
        typeof value === "object"
      ) {
        if (modifier != null) {
          throw new Error(
            `Cannot declare css with modifier (${styleName}) in a modifier (${modifier})`,
          );
        }
        // @ts-ignore
        const classes = this.injectStyles(value, styleName);
        return {...acc, ...classes};
      }

      const id = `c${hash(String(styleName), 12345)}${hash(
        String(value),
        54321,
      )}`;
      if (!this.alreadyInjected.has(id)) {
        this.alreadyInjected.add(id);
        const ruleName = getCSSName(String(styleName));
        sheet.insertRule(
          `.${id}${modifier ?? ""} { ${ruleName}: ${value}; }`,
          0,
        );
      }
      const attr = `${String(styleName)}${modifier ?? ""}`;
      acc = {...acc, [attr]: id};
      return acc;
    }, {});
  }
}
