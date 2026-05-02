'use client';

// Phase 4 — modal store. Holds the currently-active modal type plus
// its payload + escape action. Modal types are sourced from
// src/lib/modal-types.ts (verbatim port of the CRA blueprint's
// MODAL_TYPE_* constants). Style routing (centered / drawer / hint)
// happens later in ModalContainer (Phase 7) via a MODAL_STYLE_BY_TYPE
// map keyed off these same constants.
//
// NOT persisted — modal state is volatile, never round-trips a reload.

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

export type ModalType = string;

export interface ModalPayload {
  [key: string]: unknown;
}

export interface ModalStateValue {
  modalType: ModalType;
  payload: ModalPayload | null;
  // Action key dispatched when the user presses Escape or clicks the
  // backdrop. Null means "close" (no further routing).
  escapeAction: string | null;
}

export interface ModalState {
  current: ModalStateValue | null;
}

interface ModalActions {
  show: (
    modalType: ModalType,
    payload?: ModalPayload | null,
    escapeAction?: string | null,
  ) => void;
  close: () => void;
}

export type ModalStore = ModalState & ModalActions;

export const useModalStore = create<ModalStore>()(
  immer((set) => ({
    current: null,
    show: (modalType, payload, escapeAction) =>
      set((draft) => {
        draft.current = {
          modalType,
          payload: payload ?? null,
          escapeAction: escapeAction ?? null,
        };
      }),
    close: () =>
      set((draft) => {
        draft.current = null;
      }),
  }))
);
