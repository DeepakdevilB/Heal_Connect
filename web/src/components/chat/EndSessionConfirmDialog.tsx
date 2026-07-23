'use client';

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface Props {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function EndSessionConfirmDialog({ open, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent showCloseButton={false} className="max-w-xs">
        <DialogHeader>
          <DialogTitle>End this session?</DialogTitle>
          <DialogDescription>
            The session will be marked as completed and billing will stop. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="bg-transparent border-0 p-0 mt-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Keep going</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>Yes, end session</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
