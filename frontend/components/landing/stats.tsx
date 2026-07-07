const stats = [
  { value: "10k+", label: "Active Users" },
  { value: "99.9%", label: "Uptime" },
  { value: "50k+", label: "Projects Shipped" },
  { value: "4.9/5", label: "User Rating" },
];

export function Stats() {
  return (
    <section className="bg-brand-800 py-16 sm:py-20 safe-paddings">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:gap-8 lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="heading-responsive font-bold tracking-tight text-white">
                {stat.value}
              </p>
              <p className="mt-2 text-responsive font-medium text-brand-300">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
