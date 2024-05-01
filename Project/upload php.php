
<!-- image save n folder -->
<?php
            $filename = $_FILES["image"]["name"];
            $tempname = $_FILES["image"]["tmp_name"];
            $folder = "images/" . $filename;
            move_uploaded_file($tempname, $folder);
            
            // vehicale img
            
            $vfilename = $_FILES["vimg"]["name"];
            $vtempname = $_FILES["vimg"]["tmp_name"];
            $vfolder = "images/" . $vfilename;
        
            move_uploaded_file($vtempname, $vfolder);
?>


<!-- data insert into data base -->

<?php
        if($_POST['submit'])
        {
            
            $fname = $_POST['driver_name'];
            $mobile = $_POST['mobile'];
            $source = $_POST['source'];
            $destination = $_POST['destination'];
            $capacity = $_POST['capacity'];
            $vehicle_number = $_POST['vehicle_number'];
            $address = $_POST['address'];

            $query = "insert into data1 values('$folder','$fname','$mobile','$source','$destination','$capacity','$vehicle_number','$address','$vfolder')";
            $data = mysqli_query($conn,$query);

            if($data){
                //echo "successssssss";
            }
            else{
                echo "failed";
            }
        }

    ?>