// Déclarations pour les imports CSS du template (utilisés côté web uniquement).
// Sans ça, TypeScript ne sait pas typer `import './x.css'` et fait échouer tsc.
declare module '*.css';
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}
