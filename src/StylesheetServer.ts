import type Styler from "./index";
import type {StyleDeclaration} from "./index";

type RenderPageResult = {
  html: string;
};
const StylesheetServer =
  typeof window !== "undefined"
    ? null
    : {
        renderStatic<T extends StyleDeclaration>(
          styler: Styler<T>,
          renderFunc: () => RenderPageResult | Promise<RenderPageResult>,
        ) {
          const html = renderFunc();
          const css = styler.ssrCapture();
          return {
            html,
            css,
          };
        },
      };
export default StylesheetServer;
