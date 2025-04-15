
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    // Function to determine if the device is mobile based on screen width
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    
    // Initial check
    checkIsMobile()
    
    // Add event listeners for both resize and orientation change
    window.addEventListener("resize", checkIsMobile)
    window.addEventListener("orientationchange", checkIsMobile)
    
    // Cleanup function to remove event listeners
    return () => {
      window.removeEventListener("resize", checkIsMobile)
      window.removeEventListener("orientationchange", checkIsMobile)
    }
  }, [])

  // Return true if definitely mobile, otherwise default to false
  // This ensures components don't flash desktop layout before detection
  return isMobile === undefined ? false : isMobile
}
