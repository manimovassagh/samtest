export interface User {
  username: string;
  expectSuccess: boolean;
  errorMessage?: string;
  description: string;
}

export interface ProfileUser extends User {
  tags: string[];
}

// Plain user list — no profile tags (used by Example 1)
export const users: User[] = [
  { username: 'standard_user',        expectSuccess: true,  description: 'logs in and reaches inventory' },
  { username: 'locked_out_user',      expectSuccess: false, description: 'is blocked with a locked-out error', errorMessage: 'Sorry, this user has been locked out.' },
  { username: 'problem_user',         expectSuccess: true,  description: 'logs in (images broken but page loads)' },
  { username: 'performance_glitch_user', expectSuccess: true, description: 'logs in after an artificial delay' },
  { username: 'error_user',           expectSuccess: true,  description: 'logs in (errors appear on later interactions)' },
  { username: 'visual_user',          expectSuccess: true,  description: 'logs in (visual differences on inventory)' },
];

// Profile-tagged user list — controls which tests run per project (used by Example 2)
//   @smoke  →  1 user  (standard happy-path only)
//   @core   →  2 users (adds the main error-path case)
//   @full   →  all 6   (every built-in SauceDemo account)
export const profileUsers: ProfileUser[] = [
  { username: 'standard_user',        expectSuccess: true,  description: 'logs in and reaches inventory',                   tags: ['@smoke', '@core', '@full'] },
  { username: 'locked_out_user',      expectSuccess: false, description: 'is blocked with a locked-out error',              tags: ['@core', '@full'], errorMessage: 'Sorry, this user has been locked out.' },
  { username: 'problem_user',         expectSuccess: true,  description: 'logs in (images broken but page loads)',           tags: ['@full'] },
  { username: 'performance_glitch_user', expectSuccess: true, description: 'logs in after an artificial delay',             tags: ['@full'] },
  { username: 'error_user',           expectSuccess: true,  description: 'logs in (errors appear on later interactions)',    tags: ['@full'] },
  { username: 'visual_user',          expectSuccess: true,  description: 'logs in (visual differences on inventory)',        tags: ['@full'] },
];
