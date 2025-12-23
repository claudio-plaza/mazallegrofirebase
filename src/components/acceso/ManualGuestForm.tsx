
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

export default function ManualGuestForm() {
    const [nombre, setNombre] = useState('');
    const [apellido, setApellido] = useState('');
    const [dni, setDni] = useState('');
    const [fechaNacimiento, setFechaNacimiento] = useState('');
    const { toast } = useToast();

    const handleSubmit = () => {
        if (!nombre || !apellido || !dni || !fechaNacimiento) {
            toast({ title: "Faltan datos", description: "Complete todos los campos.", variant: "destructive" });
            return;
        }

        const event = new CustomEvent('manual-guest-submit', {
            detail: {
                nombre,
                apellido,
                dni,
                fechaNacimiento: fechaNacimiento // Already YYYY-MM-DD string from input
            }
        });
        window.dispatchEvent(event);
        
        // Reset form
        setNombre('');
        setApellido('');
        setDni('');
        setFechaNacimiento('');
    };

    return (
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del invitado" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input id="apellido" value={apellido} onChange={(e) => setApellido(e.target.value)} placeholder="Apellido" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Input id="dni" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="DNI sin puntos" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
                <Input 
                    id="fechaNacimiento"
                    type="date" 
                    value={fechaNacimiento} 
                    onChange={(e) => setFechaNacimiento(e.target.value)}
                    max={new Date().toISOString().split('T')[0]} // Max today
                />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                     <Button type="button" variant="secondary">Cancelar</Button>
                </DialogClose>
                <DialogClose asChild>
                     <Button type="button" onClick={handleSubmit}>Agregar Invitado</Button>
                </DialogClose>
            </DialogFooter>
        </div>
    );
}
