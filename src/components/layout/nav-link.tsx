import Link from 'next/link';

interface NavLinkProps {
  href: string;
  children: React.ReactNode;
}

export function NavLink({ href, children }: NavLinkProps) {
  return (
    <Link
      href={href}
      className="block px-4 py-2 rounded-md hover:bg-gray-100 transition-colors"
    >
      {children}
    </Link>
  );
}