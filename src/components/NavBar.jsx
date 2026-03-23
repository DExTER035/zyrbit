import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BarChart2, Sparkles, User } from 'lucide-react';

export default function NavBar() {
  const tabs = [
    { to: "/dashboard", icon: <Home className="w-6 h-6" />, label: "Home" },
    { to: "/stats", icon: <BarChart2 className="w-6 h-6" />, label: "Stats" },
    { to: "/coach", icon: <Sparkles className="w-6 h-6" />, label: "Coach" },
    { to: "/profile", icon: <User className="w-6 h-6" />, label: "Profile" }
  ];

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-[#121212]/95 backdrop-blur-md border-t border-gray-800 px-6 py-4 flex justify-between items-center pb-6 z-50">
      {tabs.map(tab => (
        <NavLink 
          key={tab.to} 
          to={tab.to}
          className={({ isActive }) => `flex flex-col items-center gap-1.5 transition-colors ${isActive ? 'text-white scale-110' : 'text-gray-500 hover:text-gray-300'}`}
        >
          {tab.icon}
          <span className="text-[10px] font-bold tracking-wider uppercase">{tab.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
