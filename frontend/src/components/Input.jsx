export default function Input({

    label,

    error,

    className = "",

    ...props

}) {

    return (

        <div className="space-y-2">

            {label && (

                <label className="block text-sm font-medium text-slate-300">

                    {label}

                </label>

            )}

            <input

                className={`
                    w-full
                    rounded-xl
                    border
                    border-slate-700
                    bg-slate-900
                    px-4
                    py-3
                    text-white
                    placeholder:text-slate-500
                    outline-none
                    transition-all
                    duration-300
                    focus:border-blue-500
                    focus:ring-2
                    focus:ring-blue-500/20
                    ${className}
                `}

                {...props}

            />

            {error && (

                <p className="text-red-400 text-sm">

                    {error}

                </p>

            )}

        </div>

    );

}