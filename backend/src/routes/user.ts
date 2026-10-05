import { PrismaClient } from '@prisma/client/edge';
import { withAccelerate } from '@prisma/extension-accelerate';
import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import { signinInput, signupInput } from '@monish21/medium-common';
import { hashPassword, verifyPassword } from '../auth';

export const userRouter=new Hono<{Bindings:{DATABASE_URL:string;JWT_SECRET:string}}>();
const createToken=(id:string,secret:string)=>sign({id,exp:Math.floor(Date.now()/1000)+(60*60*24*7)},secret,'HS256');

userRouter.post('/signup',async context=>{const prisma=new PrismaClient({datasourceUrl:context.env.DATABASE_URL}).$extends(withAccelerate());const body=await context.req.json();const parsed=signupInput.safeParse(body);if(!parsed.success)return context.json({error:'Enter a valid email and a password of at least 6 characters.'},400);const email=parsed.data.email.trim().toLowerCase();const name=parsed.data.name?.trim().slice(0,80);try{const existing=await prisma.user.findFirst({where:{email:{equals:email,mode:'insensitive'}},select:{id:true}});if(existing)return context.json({error:'An account with this email already exists.'},409);const user=await prisma.user.create({data:{email,name,password:await hashPassword(parsed.data.password)}});return context.text(await createToken(user.id,context.env.JWT_SECRET))}catch{return context.json({error:'We could not create your account. Please try again.'},500)}});

userRouter.post('/signin',async context=>{const prisma=new PrismaClient({datasourceUrl:context.env.DATABASE_URL}).$extends(withAccelerate());const body=await context.req.json();const parsed=signinInput.safeParse(body);if(!parsed.success)return context.json({error:'Enter a valid email and password.'},400);const email=parsed.data.email.trim().toLowerCase();const user=await prisma.user.findFirst({where:{email:{equals:email,mode:'insensitive'}}});if(!user)return context.json({error:'The email or password is incorrect.'},403);const result=await verifyPassword(parsed.data.password,user.password);if(!result.valid)return context.json({error:'The email or password is incorrect.'},403);const data:{password?:string;email?:string}={};if(result.needsUpgrade)data.password=await hashPassword(parsed.data.password);if(user.email!==email)data.email=email;if(Object.keys(data).length)await prisma.user.update({where:{id:user.id},data});return context.text(await createToken(user.id,context.env.JWT_SECRET))});
