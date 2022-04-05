import astyle from "@astyle/astyle";
import * as CSS from "csstype";

type LimitedStyles = Pick<CSS.Properties, "margin" | "padding" | "width" | "height" | "color" | "backgroundColor">; 

const styler = astyle<LimitedStyles>({
  mode: "inject",
});

export default styler;
