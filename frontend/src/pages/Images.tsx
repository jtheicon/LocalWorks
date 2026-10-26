import { API_ORIGIN } from "@/lib/apiOrigin";
import axios from "axios"

const Images = () => {

  // https://medium.com/@wenhsuanliao/a-simple-way-to-solve-err-blocked-by-response-notsameorigin-85a6201f838
  return (
    <img src={`${API_ORIGIN}/public/profile/avatar-1771237929804.png`} alt="N/A" />
  )
}

export default Images