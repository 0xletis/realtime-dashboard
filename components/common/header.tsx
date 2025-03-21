interface HeaderProps {
  title: string;
  subtitle: string;
  githubUrl: string;
}

const Header = ({ title, subtitle, githubUrl }: HeaderProps) => {
  const [firstPart, ...rest] = title.split(/(?=[A-Z])/);
  const secondPart = rest.join('');

  return (
    <div className="border-b border-[#003920] p-2 w-full bg-[#002713]/50 shadow-lg">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-extrabold text-white tracking-tight">
          <span className="text-green-400">{firstPart}</span>{secondPart}
          <span className="text-xs font-normal text-gray-400 ml-2">{subtitle}</span>
        </h1>
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-green-400 hover:text-green-200 transition-colors"
        >
          <svg
            viewBox="0 0 24 24"
            width="24"
            height="24"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
          </svg>
        </a>
      </div>
    </div>
  );
};

export default Header; 