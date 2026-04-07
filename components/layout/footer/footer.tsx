export default function Footer() {

    return (
        <footer className="w-full border-t bg-transparent text-center text-sm p-4">
            <p className="text-gray-500">
                &copy; {new Date().getFullYear()} Spendemon. All rights reserved.
            </p>
        </footer>
    )

}