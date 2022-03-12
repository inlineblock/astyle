import React, {useMemo} from "react";

type Variables = {[key: string]: string | number};
type Props = {
  children: JSX.Element | JSX.Element[];
  tag?: "div" | "span";
  variables: Readonly<Variables>;
};

export default function ThemeRoot({children, tag = "div", variables}: Props) {
  const style = useMemo(() => {
    return Object.keys(variables).reduce((acc: Variables, name: string) => {
      const value = variables[name];
      const variableName = name.startsWith("--") ? name : `--${name}`;
      acc[variableName] = value;
      return acc;
    }, {});
  }, [variables]);
  const Tag = tag;
  return <Tag style={style}>{children}</Tag>;
}
