import { Response } from "express"

// If there are instace of errors:
export const instanceErrors = (error: unknown, res: Response) => {
  if (error instanceof Error) {
    console.error(error)

    return res.status(400).json({
      success: false,
      message: error.message,
      info: error.message
    })
  }

  mainError(error, res)
}


// If there is only an internal server error:
export const mainError = (error: unknown, res: Response) => {
  console.error(error)

  return res.status(500).json({
    success: false,
    message: "Internal Server Error"
  })
}