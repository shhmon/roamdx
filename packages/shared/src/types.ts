export interface TmuxSession {
  name: string;
  created: string;
  attached: number;
  cols: number;
  rows: number;
}

export interface SessionListResponse {
  sessions: TmuxSession[];
}
