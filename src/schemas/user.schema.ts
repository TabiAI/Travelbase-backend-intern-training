import {z} from 'zod';

export const ChangePasswordRequest = z.object({
    currentPassword: z.string().min(8).max(128),
    newPassword: z.string().min(8).max(128),
}).refine(data => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
});

export const IdParamSchema = z.object({id: z.string().uuid()});
