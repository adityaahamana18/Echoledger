import { motion } from "framer-motion";

export default function Button({

children,

className="",

...props

}){

return(

<motion.button

whileHover={{

scale:1.05

}}

whileTap={{

scale:.97

}}

className={`

px-7

py-3.5

rounded-xl

font-semibold

text-white

bg-gradient-to-r

from-blue-600

to-blue-500

hover:from-blue-500

hover:to-violet-600

transition-all

shadow-lg

shadow-blue-600/30

${className}

`}

{...props}

>

{children}

</motion.button>

)

}