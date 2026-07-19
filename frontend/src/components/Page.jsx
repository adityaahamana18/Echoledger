import { motion } from "framer-motion";

export default function Page({

children

}){

return(

<motion.main

initial={{

opacity:0

}}

animate={{

opacity:1

}}

transition={{

duration:.4

}}

className="relative overflow-hidden"

>

<div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[180px]"/>

<div className="absolute top-[600px] right-0 w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[180px]"/>

{children}

</motion.main>

)

}