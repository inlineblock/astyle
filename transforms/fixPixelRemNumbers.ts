import type {StyleDeclaration} from "lib/styler";

const PixelsSet: Set<keyof StyleDeclaration> = new Set([
  "marginBottom",
  "marginLeft",
  "marginRight",
  "marginTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "paddingTop",
  "width",
  "minWidth",
  "maxWidth",
  "height",
  "minHeight",
  "maxHeight",
]);

const RemsSet: Set<keyof StyleDeclaration> = new Set([
  "fontSize",
  "lineHeight",
]);

export default function pixelToRem(
  originalDeclarations: StyleDeclaration,
): StyleDeclaration {
  const declarations = {...originalDeclarations};
  for (const name of Array.from(PixelsSet)) {
    if (
      originalDeclarations.hasOwnProperty(name) &&
      typeof originalDeclarations[name] === "number"
    ) {
      declarations[name] = `${declarations[name]}px`;
    }
  }

  for (const name of Array.from(RemsSet)) {
    if (
      originalDeclarations.hasOwnProperty(name) &&
      typeof originalDeclarations[name] === "number"
    ) {
      declarations[name] = `${declarations[name]}rem`;
    }
  }

  return declarations;
}
