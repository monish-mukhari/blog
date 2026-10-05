import { Blog } from '../hooks';
export const categories=['For you','Design','Technology','Culture','Work','Life'];
export const stringHash=(value:string)=>value.split('').reduce((acc,char)=>((acc<<5)-acc)+char.charCodeAt(0),0);
export const blogCategory=(blog:Pick<Blog,'title'|'tags'>)=>blog.tags?.[0]||categories[1+Math.abs(stringHash(blog.title))%(categories.length-1)];
export const readTime=(content:string)=>Math.max(1,Math.ceil(content.trim().split(/\s+/).length/220));
export const formatDate=(date?:string)=>date?new Intl.DateTimeFormat('en',{month:'short',day:'numeric',year:'numeric'}).format(new Date(date)):'Recently';
export const initials=(name:string)=>name.split(/\s+/).map(part=>part[0]).join('').slice(0,2).toUpperCase();
export const excerpt=(blog:Pick<Blog,'content'|'excerpt'>)=>blog.excerpt||blog.content.replace(/\s+/g,' ').slice(0,180);
