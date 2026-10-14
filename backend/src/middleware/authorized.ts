import jwt from "jsonwebtoken"
import { Request, Response, NextFunction } from "express"


const authorized = (req: Request, res: Response, next: NextFunction) => {
  const { token } = req.cookies

  // If header doesn't exists:
  if (!token)
    return res.status(401).json({ success: false, message: "No token, authorization denied" })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid token"
    })
  }
}

export default authorized