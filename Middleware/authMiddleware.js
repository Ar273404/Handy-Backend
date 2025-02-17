import jwt from 'jsonwebtoken'

const verifyToken = async (req,res,next) => {
    const token = req.cookies.token;
    if(!token){
        return res.status(401).json({
            success:false,
            message:"No token provided",
        })
    }
    try {
        const decoded = await jwt.verify(token,process.env.JWT_SECRET_KEY);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({
            success:false,
            message:"token is invalid or expired",
        });
    }
}

export default verifyToken;
