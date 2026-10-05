import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Blog } from './pages/Blog';
import { Blogs } from './pages/Blogs';
import { Home } from './pages/Home';
import { NotFound } from './pages/NotFound';
import { Publish } from './pages/Publish';
import { Signin } from './pages/Signin';
import { Signup } from './pages/Signup';

function App(){return <BrowserRouter><Routes><Route path="/" element={<Home/>}/><Route path="/signup" element={<Signup/>}/><Route path="/signin" element={<Signin/>}/><Route path="/blog/:id" element={<ProtectedRoute><Blog/></ProtectedRoute>}/><Route path="/blogs" element={<ProtectedRoute><Blogs/></ProtectedRoute>}/><Route path="/publish" element={<ProtectedRoute><Publish/></ProtectedRoute>}/><Route path="*" element={<NotFound/>}/></Routes></BrowserRouter>}
export default App;
