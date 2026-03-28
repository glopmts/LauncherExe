export const IPC_CHANNELS = {
  // File handlers
  SELECT_FOLDER: 'select-folder',
  SELECT_FILE: 'select-file',
  READ_DIRECTORY: 'read-directory',
  RUN_EXE: 'run-exe',
  GET_FILE_STATS: 'get-file-stats',
  OPEN_FOLDER: 'open-folder',
  GET_APP_ICON: 'get-app-icon',

  // Window controls
  MINIMIZE_WINDOW: 'minimize-window',
  MAXIMIZE_WINDOW: 'maximize-window',
  CLOSE_WINDOW: 'close-window',
  OPEN_DEVTOOLS: 'open-devtools',

  // Auto launch
  SET_AUTO_LAUNCH: 'set-auto-launch',
  GET_AUTO_LAUNCH_STATUS: 'get-auto-launch-status',

  // Notifications
  REQUEST_NOTIFICATION_PERMISSION: 'request-notification-permission',
  SHOW_NOTIFICATION: 'show-notification',

  // Settings
  SAVE_SETTINGS: 'save-settings',
  LOAD_SETTINGS: 'load-settings',

  // Store
  STORE_GET: 'store:get',
  STORE_SET: 'store:set',
  STORE_REMOVE: 'store:remove',
  STORE_CLEAR: 'store:clear'
} as const

export type IPCChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
