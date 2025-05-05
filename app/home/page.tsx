"use client";

import React from "react";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Home() {
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    axios
      .get("http://localhost:8080/home", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((response) => {
        setMessage(
          `Welcome, ${response.data.username}! ${response.data.message}`
        );
      })
      .catch((err) => {
        localStorage.removeItem("token");
        router.push("/");
      });
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/");
  };

  return (
    <div className="grid grid-cols-4 gap-4 bg-gray-900 text-white ">
      <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6">Home Page</h2>
        <p className="text-gray-300 mb-6">{message}</p>
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 text-white p-2 rounded hover:bg-red-700 transition"
        >
          Logout
        </button>
      </div>
      <div className="">XD</div>
    </div>
  );
}
