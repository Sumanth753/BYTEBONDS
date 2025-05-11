// Store user roles in localStorage
const USER_ROLE_KEY = "bytebonds-user-role"

export type UserRole = "freelancer" | "investor"

/**
 * Get the user's role from localStorage
 */
export function getUserRole(walletAddress: string): UserRole | null {
  if (typeof window === "undefined") return null

  try {
    const storedData = localStorage.getItem(`${USER_ROLE_KEY}-${walletAddress}`)
    if (!storedData) return null

    const role = JSON.parse(storedData) as UserRole
    return role === "freelancer" || role === "investor" ? role : null
  } catch (error) {
    console.error("Error getting user role:", error)
    return null
  }
}

/**
 * Set the user's role in localStorage
 */
export function setUserRole(walletAddress: string, role: UserRole): void {
  if (typeof window === "undefined") return

  try {
    localStorage.setItem(`${USER_ROLE_KEY}-${walletAddress}`, JSON.stringify(role))
  } catch (error) {
    console.error("Error setting user role:", error)
  }
}

/**
 * Switch the user's role (from freelancer to investor or vice versa)
 */
export function switchUserRole(walletAddress: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const currentRole = getUserRole(walletAddress)

      if (currentRole === "freelancer") {
        setUserRole(walletAddress, "investor")
      } else if (currentRole === "investor") {
        setUserRole(walletAddress, "freelancer")
      } else {
        // If no role is set, default to freelancer
        setUserRole(walletAddress, "freelancer")
      }

      resolve()
    } catch (error) {
      console.error("Error switching user role:", error)
      reject(error)
    }
  })
}

/**
 * Clear the user's role from localStorage
 */
export function clearUserRole(walletAddress: string): void {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(`${USER_ROLE_KEY}-${walletAddress}`)
  } catch (error) {
    console.error("Error clearing user role:", error)
  }
}
