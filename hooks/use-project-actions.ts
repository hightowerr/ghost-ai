"use client";

import { useCallback, useState } from "react";

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
      setState((prev) => {
        if (prev.loading) return prev;
        return { ...prev, loading: true };
      });

      // Read current loading state after the setState above is applied.
      // Use a ref-style pattern: check inside try block after the state flush.
      try {
        const res = await fetch(`/api/projects/${projectId}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          setState((prev) => ({ ...prev, loading: false }));
          return;
        }
        setState((prev) => ({ ...prev, dialog: null, loading: false }));
        onDeleted?.();
      } catch {
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
