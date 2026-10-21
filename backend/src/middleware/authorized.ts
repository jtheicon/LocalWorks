import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express"
import { touchActivity } from "../services/accountCleanup"


const authorized = (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.cookies

  // If header doesn't exists:
  if (!token)
    return res.status(401).json({ success: false, message: "No token, authorization denied" })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string)
    req.user = decoded
    // Keeps "last active" fresh for the 6-month inactivity cleanup (throttled).
    if (typeof decoded === "object") touchActivity(decoded.id, decoded.role)
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    })
  }
}

export default authorized