// Source - https://stackoverflow.com/a
// Posted by Bruno Bastos, modified by community. See post 'Timeline' for change history
// Retrieved 2026-01-13, License - CC BY-SA 4.0

declare namespace Express {
  export interface Request {
      user: any;
  }
  export interface Response {
      user: any;
  }
}
