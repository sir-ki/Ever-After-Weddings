import { ptSerif, ptSans } from "@/lib/guest-fonts";

// Covers /directory and /directory/apply (nested, same subtree) —
// consistent presentation there for free, not extra scope.
export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`ea-theme ${ptSerif.variable} ${ptSans.variable} min-h-screen`}>
      {children}
    </div>
  );
}
