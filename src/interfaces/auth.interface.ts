// DTO-> data transfer object

export interface DeviceId{
    deviceId: string;
}

export interface SignupDTO extends DeviceId {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    company: string;
}

export interface LoginDTO extends DeviceId {
    email: string;
    password: string;
}

export interface RefreshTokenDTO extends DeviceId {
    refreshToken: string
}

export interface ResetPasswordDTO extends DeviceId{
    confirmationToken: string;
    newPassword: string;
}

export interface ForgotPasswordDTO extends DeviceId{
    email: string;
}

export interface ChangePasswordDTO extends DeviceId{
    currentPassword: string;
    newPassword: string;
}

export interface VerifyDeviceChangeOTPDTO extends DeviceId {
    otp: string;
}





