const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true };

export const PlayIcon = (p) => (
  <svg {...base} {...p}><path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" /></svg>
);
export const InfoIcon = (p) => (
  <svg {...base} {...p}><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16Zm-1 7v6h2v-6h-2Zm0-4v2h2V7h-2Z" /></svg>
);
export const PlusIcon = (p) => (
  <svg {...base} {...p}><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7V4Z" /></svg>
);
export const SearchIcon = (p) => (
  <svg {...base} {...p}><path d="M10 3a7 7 0 0 1 5.6 11.2l5.1 5.1-1.4 1.4-5.1-5.1A7 7 0 1 1 10 3Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg>
);
export const CloseIcon = (p) => (
  <svg {...base} {...p}><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" /></svg>
);
export const BackIcon = (p) => (
  <svg {...base} {...p}><path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20v-2Z" /></svg>
);
export const ChevronIcon = ({ dir = 'right', ...p }) => (
  <svg {...base} {...p} style={{ transform: dir === 'left' ? 'rotate(180deg)' : undefined }}>
    <path d="m9 5 7 7-7 7-1.4-1.4 5.6-5.6-5.6-5.6L9 5Z" />
  </svg>
);
export const EditIcon = (p) => (
  <svg {...base} {...p}><path d="M4 17.2V20h2.8l8.3-8.3-2.8-2.8L4 17.2ZM19.7 7a1 1 0 0 0 0-1.4l-1.3-1.3a1 1 0 0 0-1.4 0l-1.6 1.6 2.8 2.8L19.7 7Z" /></svg>
);
export const TrashIcon = (p) => (
  <svg {...base} {...p}><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-3 6h12l-1 12H7L6 9Z" /></svg>
);
export const LogoutIcon = (p) => (
  <svg {...base} {...p}><path d="M10 4H5v16h5v2H3V2h7v2Zm5.6 3.4L20.2 12l-4.6 4.6-1.4-1.4 2.2-2.2H9v-2h7.4l-2.2-2.2 1.4-1.4Z" /></svg>
);
export const ReplayIcon = (p) => (
  <svg {...base} {...p}><path d="M12 5V2L7 6l5 4V7a5 5 0 1 1-5 5H5a7 7 0 1 0 7-7Z" /></svg>
);
