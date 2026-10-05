import axios from 'axios';
import { BACKEND_URL } from '../config';
const auth=()=>({Authorization:`Bearer ${localStorage.getItem('token')||''}`});
export const setStorySaved=async(id:string,saved:boolean)=>{window.dispatchEvent(new CustomEvent('saved-change',{detail:{id,saved}}));try{await axios.post(`${BACKEND_URL}/api/v1/blog/${id}/bookmark`,{saved},{headers:auth()})}catch{window.dispatchEvent(new CustomEvent('saved-change',{detail:{id,saved:!saved}}));throw new Error('Bookmark could not be updated')}};
