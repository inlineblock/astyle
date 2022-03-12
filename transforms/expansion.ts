import type {StyleDeclaration} from "lib/styler";

const TRBLSet: {
  [name: string]: (w: string) => keyof StyleDeclaration;
} = {
  borderColor: (w: string) => `border${w}Color`,
  borderStyle: (w: string) => `border${w}Style`,
  borderWidth: (w: string) => `border${w}Width`,
  margin: (w: string) => `margin${w}`,
  padding: (w: string) => `padding${w}`,
};

function normalizeStyleName<T extends StyleDeclaration>(
  name: string,
  value: string | number,
): StyleDeclaration {
  const valueParts =
    typeof value === "string"
      ? value.split(/(?!\(.*)\s(?![^(]*?\))/g)
      : [value];
  const g = TRBLSet[name];
  return {
    [g("Top")]: valueParts[0],
    [g("Right")]: valueParts[1] ?? valueParts[0],
    [g("Bottom")]: valueParts[2] ?? valueParts[0],
    [g("Left")]: valueParts[3] ?? valueParts[1] ?? valueParts[0],
  };
}

export default function expansion(
  originalDeclarations: StyleDeclaration,
): StyleDeclaration {
  const declarations = {...originalDeclarations};
  for (const name in TRBLSet) {
    if (originalDeclarations.hasOwnProperty(name)) {
      delete declarations[name];
      const value = originalDeclarations[name];
      if (typeof value === "string" || typeof value === "number") {
        Object.assign(declarations, normalizeStyleName(name, value));
      }
    }
  }

  return declarations;
}
