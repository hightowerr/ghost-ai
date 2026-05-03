"use client";

import { useCallback, useRef, useState } from "react";

export type ProjectDialog = "rename" | "delete" | null;

interface ProjectActionsState {
  dialog: ProjectDialog;
  name: string;
  loading: boolean;
}

interface UseProjectActionsOptions {
  onDeleted?: () => void;
}

interface UseProjectActionsReturn extends ProjectActionsState {
  openRename: (currentName: string) => void;
  closeDialog: () => void;
  setName: (name: string) => void;
  setLoading: (loading: boolean) => void;
  openDelete: () => void;
  closeDelete: () => void;
  handleDelete: (projectId: string) => Promise<void>;
}

export function useProjectActions(
  options: UseProjectActionsOptions = {}
): UseProjectActionsReturn {
  const { onDeleted } = options;

  const [state, setState] = useState<ProjectActionsState>({
    dialog: null,
    name: "",
    loading: false,
  });

  const deletingRef = useRef(false);

  const openRename = useCallback((currentName: string) => {
    setState({ dialog: "rename", name: currentName, loading: false });
  }, []);

  const closeDialog = useCallback(() => {
    setState((prev) => ({ ...prev, dialog: null, loading: false }));
  }, []);

  const setName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, name }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const openDelete = useCallback(() => {
    setState((prev) => ({ ...prev, dialog: "delete", loading: false }));
  }, []);

  const closeDelete = useCallback(() => {
    setState((prev) => ({ ...prev, dialog: null }));
  }, []);

  const handleDelete = useCallback(
    async (projectId: string) => {
      if (deletingRef.current) return;
      deletingRef.current = true;
      setState((prev) => ({ ...prev, loading: true }));

      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          deletingRef.current = false;
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }
        deletingRef.current = false;
        setState((prev) => ({ ...prev, dialog: null, loading: false }));
        onDeleted?.();
      } catch {
        deletingRef.current = false;
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [onDeleted]
  );

  return {
    ...state,
    openRename,
    closeDialog,
    setName,
    setLoading,
    openDelete,
    closeDelete,
    handleDelete,
  };
}
