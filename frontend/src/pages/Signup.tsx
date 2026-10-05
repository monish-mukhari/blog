import { Auth } from '../components/Auth';import { Quote } from '../components/Quote';import { LogoBar } from '../components/AppBar';
export const Signup=()=> <div className="page-shell relative"><LogoBar/><div className="grid min-h-screen lg:grid-cols-2"><Auth type="signup"/><div className="hidden lg:block"><Quote/></div></div></div>
