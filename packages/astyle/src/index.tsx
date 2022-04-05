import hash from "./hash";
import getCSSName from "./getCSSName";
import SyntheticStylesheet from "./SyntheticStylesheet";
import * as CSS from "csstype";
import React, { CSSProperties } from "react";

type SupportedPsuedos =
  | ":link"
  | ":focus-within"
  | ":first-child"
  | ":last-child"
  | ":odd-child"
  | ":even-child"
  | ":hover"
  | ":focus"
  | ":active"
  | ":visited"
  | ":disabled";
const PSEUDO_ORDER: Array<SupportedPsuedos> = [
  ":link",
  ":focus-within",
  ":first-child",
  ":last-child",
  ":odd-child",
  ":even-child",
  ":hover",
  ":focus",
  ":active",
  ":visited",
  ":disabled",
];

export type StyleDeclarations = Readonly<
  CSS.Properties<string | number> & {
    [key in SupportedPsuedos]?: CSS.Properties<string | number>;
  }
>;

type StylesClassnamesMap = Record<keyof CSS.Properties, string>;

type Transform = (styles: StyleDeclarations) => StyleDeclarations;
export type AstyleMode = "inject" | "noop" | "inline";
type Options = {
  mode?: AstyleMode;
  transforms?: ReadonlyArray<Transform>;
};

type HTMLTags = keyof JSX.IntrinsicElements;
type JSXProps<TTag extends HTMLTags> = {
  cx?: Array<StylesClassnamesMap>;
} & JSX.IntrinsicElements[TTag];

let styleElement: HTMLStyleElement | undefined;
const alreadyInjected: Set<string> = new Set<string>();

function initializeStyleElement(): CSSStyleSheet {
  if (styleElement == null) {
    styleElement = window.document.createElement("style");
    styleElement.setAttribute("data-renderer", "astyle");
    styleElement.setAttribute("data-renderer-phase", "client");
    styleElement.appendChild(document.createTextNode(""));
    window.document.head.appendChild(styleElement);
  }
  if (styleElement.sheet == null) {
    throw "StyleSheet is null";
  }
  return styleElement.sheet as CSSStyleSheet;
}

type InjectRuleable = {
  insertRule(rule: string, _index: number): void;
};

export default function astyle<
  TStyles extends StyleDeclarations = StyleDeclarations
>({ mode = "inject", transforms = [] }: Options) {
  const stylesheet: InjectRuleable =
    typeof window !== "undefined" && window?.document?.head !== undefined
      ? initializeStyleElement()
      : new SyntheticStylesheet();

  function compose(...rest: Array<StylesClassnamesMap>): StylesClassnamesMap {
    const mergedStyles = rest.reduce(
      (
        acc: StylesClassnamesMap,
        style: StylesClassnamesMap | false | null | undefined
      ) => {
        if (style && style != null) {
          return { ...acc, ...style };
        }
        return acc;
      },
      {} as StylesClassnamesMap
    );
    return mergedStyles;
  }

  function createNamespaces<TNamespace extends string>(
    declarations: Record<TNamespace, TStyles>
  ): Record<TNamespace, StylesClassnamesMap> {
    const styleSheet = {} as Record<TNamespace, StylesClassnamesMap>;
    for (const name in declarations) {
      const styles = declarations[name];
      const classNamesMap = createClassNamesMap(styles);
      styleSheet[name] = classNamesMap;
    }
    return styleSheet;
  }

  function runTransforms(styles: TStyles): StyleDeclarations {
    return transforms.reduce(
      (s: StyleDeclarations, transform: Transform): StyleDeclarations =>
        transform(s),
      styles
    );
  }

  function createClassNamesMap(
    originalStyles: TStyles,
    modifier?: string
  ): StylesClassnamesMap {
    if (mode === "noop") {
      return originalStyles as any;
    }

    // when the transforms are ran, the TStyles arent guaranteed
    // maybe they want to only allow marginStart, but tranforms it to marginLeft
    const styles = runTransforms(originalStyles);
    const classNamesMap = {} as StylesClassnamesMap;
    for (const styleName in styles) {
      const value = styles[styleName as keyof StyleDeclarations];
      if (value == null) {
        continue;
      }
      if (
        typeof styleName === "string" &&
        styleName.startsWith(":") &&
        typeof value === "object"
      ) {
        if (modifier != null) {
          throw new Error(
            `Cannot declare css with modifier (${styleName}) in a modifier (${modifier})`
          );
        }
        const classes = createClassNamesMap(value as TStyles, styleName);
        Object.assign(classNamesMap, classes);
      } else {
        const id = `c${hash(String(styleName), 12345)}${hash(
          String(value),
          54321
        )}`;
        if (mode === "inject") {
          if (!alreadyInjected.has(id)) {
            alreadyInjected.add(id);
            const ruleName = getCSSName(String(styleName));
            stylesheet.insertRule(
              `.${id}${modifier ?? ""} { ${ruleName}: ${value}; }`,
              0
            );
          }
          const attr = `${styleName}${modifier ?? ""}`;
          Object.assign(classNamesMap, { [attr]: id });
        } else {
          Object.assign(classNamesMap, { [styleName]: String(value) });
        }
      }
    }
    return classNamesMap;
  }

  function ssrCapture() {
    if (stylesheet instanceof SyntheticStylesheet) {
      return stylesheet.toString();
    }
    return "";
  }

  function jsx<TTag extends keyof JSX.IntrinsicElements>(Tag: TTag) {
    return (styles: TStyles) => {
      const classNamesMap = createClassNamesMap(styles);
      const component = function AstyleComponent({
        cx: cxProp = [],
        className: originalClassName,
        style: originalStyles = {},
        ...otherProps
      }: JSXProps<TTag>) {
        let style = originalStyles;
        let className = originalClassName ?? "";
        if (mode === "inline") {
          style = {
            ...compose(classNamesMap, ...cxProp),
            ...style,
          } as CSSProperties;
        } else {
          className = [
            className,
            cx.apply(undefined, [classNamesMap, ...cxProp]),
          ]
            .filter(Boolean)
            .join(" ");
        }
        return (
          <Tag
            {...(otherProps as any)}
            style={style}
            className={
              className.length === 0 && originalClassName === undefined
                ? undefined
                : className
            }
          />
        );
      };
      component.displayName = `AstyleComponent<${Tag}>`;
      return component;
    };
  }
  function getClassNames(mergedStyles: StylesClassnamesMap): string {
    return Object.values(mergedStyles).join(" ");
  }

  function cx(...styles: Array<StylesClassnamesMap>) {
    return getClassNames(compose(...styles));
  }

  return {
    create: createNamespaces,
    cx,
    compose,
    jsx,
    ssrCapture,
  };
}
