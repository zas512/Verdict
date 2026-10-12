"use client";
import { setHeaderData } from "@/redux/header";
import { useEffect } from "react";
import { useDispatch } from "react-redux";

export function HeaderUpdater({ title }: Readonly<{ title: string }>) {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setHeaderData({ title }));
  }, [title, dispatch]);
  return null;
}
