import Astyle from "./index";

type RenderPageResult = {
  html: string;
};
const StylesheetServer =
  typeof window !== "undefined"
    ? null
    : (astyle: ReturnType<typeof Astyle>) => {
        return (
          renderFunc: () => RenderPageResult | Promise<RenderPageResult>
        ) => {
          const html = renderFunc();
          const css = astyle.ssrCapture();
          return {
            html,
            css: "",
          };
        };
      };
export default StylesheetServer;
