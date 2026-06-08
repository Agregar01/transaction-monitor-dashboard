import { redirect } from "next/navigation";

// Server component. The middleware redirects "/" at the edge based on the
// session cookie before this renders; this is a no-JS fallback for the rare
// case the matcher is bypassed.
export default function Home() {
  redirect("/login");
}
