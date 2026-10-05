import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { blogRouter } from './routes/blog';
import { userRouter } from './routes/user';

const app=new Hono<{Bindings:{DATABASE_URL:string;JWT_SECRET:string};Variables:{userId:string}}>();
app.use('/*',cors({origin:'*',allowHeaders:['Content-Type','Authorization'],allowMethods:['GET','POST','PUT','OPTIONS']}));
app.get('/health',context=>context.json({status:'ok'}));
app.route('/api/v1/user',userRouter);
app.route('/api/v1/blog',blogRouter);
app.notFound(context=>context.json({error:'Not found'},404));
app.onError((_error,context)=>context.json({error:'Internal server error'},500));
export default app;
