// Allow CSS imports in TypeScript files
declare module "*.css" {
  const content: Record<string, string>;
  export default content;
}
