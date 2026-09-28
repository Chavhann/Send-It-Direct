import React from "react";
import ThemeButton from "./ThemeButton";
import Link from "next/link";
import { LettersPullUp } from "@/components/ui/pullUp";

const Navbar = () => {
  return (
    <div className="flex justify-center">
      <div className="flex font-extrabold text-[24px] px-3 py-1 m-2 rounded-lg w-full items-center justify-between">
        <div className="flex justify-center items-center flex-grow">
          <Link href="/" className="ml-2 z-10">
            {/* Send It Direct */}
            <LettersPullUp text="Send It Direct" />
          </Link>
        </div>
        <div className="flex gap-x-2 z-10">
          <div>
            <ThemeButton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
