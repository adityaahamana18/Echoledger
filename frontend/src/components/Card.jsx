import { motion } from "framer-motion";

export default function Card({

    children,

    className = "",

    hover = true

}){

    return(

        <motion.div

            initial={{opacity:0,y:25}}

            whileInView={{opacity:1,y:0}}

            viewport={{once:true}}

            transition={{duration:.45}}

            whileHover={

                hover

                ?{

                    y:-8,

                    scale:1.02

                }

                :{}

            }

            className={`

                relative

                overflow-hidden

                rounded-3xl

                border

                border-slate-800

                bg-slate-900/70

                backdrop-blur-xl

                shadow-2xl

                p-8

                transition-all

                duration-300

                ${className}

            `}

        >

            <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 to-violet-600/5"/>

            <div className="relative z-10">

                {children}

            </div>

        </motion.div>

    )

}