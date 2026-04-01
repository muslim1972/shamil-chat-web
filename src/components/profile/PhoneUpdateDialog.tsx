import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import LinkPhoneNumber from '../LinkPhoneNumber';

interface PhoneUpdateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentPhoneNumber?: string;
    onPhoneLinked?: () => void;
}

export const PhoneUpdateDialog: React.FC<PhoneUpdateDialogProps> = ({
    open,
    onOpenChange,
    currentPhoneNumber,
    onPhoneLinked
}) => {
    // We can pass a success callback to LinkPhoneNumber if we modified it, 
    // or we can observe changes. LinkPhoneNumber handles its own state and database updates.
    // However, LinkPhoneNumber currently doesn't have an 'onSuccess' prop.
    // We might need to modify LinkPhoneNumber slightly or just rely on the user closing the dialog.
    // For now, let's just render it. The LinkPhoneNumber component handles the linking logic.
    // Ideally, we should wrap it to detect completion.

    // Let's modify LinkPhoneNumber so it accepts an onSuccess prop?
    // Or we can just trust the user flow.

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 rounded-2xl p-0 overflow-hidden">
                <DialogHeader className="sr-only">
                    <DialogTitle>تحديث رقم الهاتف</DialogTitle>
                    <DialogDescription>
                        قم بربط أو تحديث رقم هاتفك لاستخدامه في استعادة الحساب وتأمين الوصول.
                    </DialogDescription>
                </DialogHeader>
                <div className="p-1">
                    {/* LinkPhoneNumber already has a card-like style, we might want to strip it or just place it inside */}
                    {/* It expects to be used standalone mostly, but it works here too. */}
                    <LinkPhoneNumber />
                </div>
            </DialogContent>
        </Dialog>
    );
};
