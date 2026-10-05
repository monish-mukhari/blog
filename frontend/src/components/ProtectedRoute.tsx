import { Navigate, useLocation } from 'react-router-dom';

export const ProtectedRoute=({children}:{children:JSX.Element})=>{const location=useLocation();const token=localStorage.getItem('token');return token?children:<Navigate to="/signin" replace state={{from:location.pathname}}/>}
