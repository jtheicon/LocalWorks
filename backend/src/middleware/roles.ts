import { Request, Response, NextFunction } from "express"


// If the user role === "admin":
export const admin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Admins only!"
    })
  }
  next()
}

// If the user role === "worker":
export const worker = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.role !== "worker") {
    return res.status(403).json({
      success: false,
      message: "Workers only!"
    })
  }
  next()
}

// If the user role === "employer":
export const employers = (req: Request, res: Response, next: NextFunction) => {
  if (req.user.role !== "employer") {
    return res.status(403).json({
      success: false,
      message: "Employers only!"
    })
  }
  next()
}