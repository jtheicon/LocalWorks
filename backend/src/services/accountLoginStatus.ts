import { isOperationalAccountStatus } from "./inactivityPolicy";

export type AccountLoginFailure = {
  code?: "ACCOUNT_DEACTIVATED" | "ACCOUNT_DELETED" | "ACCOUNT_UNAVAILABLE";
  message: string;
};

export const accountLoginFailure = (
  status: string,
  deactivationReason?: unknown,
): AccountLoginFailure | null => {
  if (status === "deleted") {
    return {
      code: "ACCOUNT_DELETED",
      message:
        deactivationReason === "inactivity"
          ? "Your account was deleted due to inactivity. Create a new account to use LocalWorks again."
          : "This account has been deleted. Contact an administrator if you need help.",
    };
  }

  if (status === "not_active") {
    return {
      code: "ACCOUNT_DEACTIVATED",
      message:
        deactivationReason === "admin"
          ? "Your account was deactivated by an administrator. Contact support for help."
          : "Your account is not active. Contact an administrator.",
    };
  }

  if (status === "pending") {
    return {
      message: "Your account is still being verified. We will email you once it is active.",
    };
  }

  if (!isOperationalAccountStatus(status)) {
    return {
      code: "ACCOUNT_UNAVAILABLE",
      message: "Your account cannot sign in. Contact an administrator.",
    };
  }

  return null;
};
