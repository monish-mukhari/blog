import { useEffect, useState } from 'react';
import axios from 'axios';
import { BACKEND_URL } from '../config';
export interface Blog{content:string;title:string;id:string;excerpt?:string;tags?:string[];createdAt?:string;clapCount?:number;saved?:boolean;liked?:boolean;author:{id:string;name:string;followed?:boolean;followerCount?:number}}
const authHeaders=()=>({Authorization:`Bearer ${localStorage.getItem('token')||''}`});
export const useBlog=({id}:{id:string})=>{const[loading,setLoading]=useState(true);const[blog,setBlog]=useState<Blog>();const[error,setError]=useState('');useEffect(()=>{setLoading(true);axios.get(`${BACKEND_URL}/api/v1/blog/${id}`,{headers:authHeaders()}).then(r=>setBlog(r.data.blog)).catch(()=>setError('We could not load this story. Please try again.')).finally(()=>setLoading(false))},[id]);return{loading,blog,error}}
export const useBlogs=()=>{const[loading,setLoading]=useState(true);const[blogs,setBlogs]=useState<Blog[]>([]);const[error,setError]=useState('');const reload=()=>{setLoading(true);setError('');axios.get(`${BACKEND_URL}/api/v1/blog/bulk`,{headers:authHeaders()}).then(r=>setBlogs(r.data.blogs||[])).catch(e=>setError(e.response?.status===401?'Your session has expired. Please sign in again.':'Stories are taking longer than expected. Please retry.')).finally(()=>setLoading(false))};useEffect(reload,[]);return{loading,blogs,error,reload}}
